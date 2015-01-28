(function() {
	angular
		.module('app')
		.controller('datasetWizardController' , ['$scope', 'wizardMode', 'currentUser',
			function($scope, wizardMode, currentUser) {
				$scope.continueButton = null;
				$scope.backButton = null;
				$scope.endButton = null;
				$scope.canContinue = function(){return false};
				$scope.sourceData = null;
				$scope.wizardMode = wizardMode;
				if ($scope.wizardMode === 'dataset') {
					$scope.statePrefix = 'wizardDS.';
				}
				else if ($scope.wizardMode === 'source') {
					$scope.statePrefix = 'editDS.wizardS.';
				}
				$scope.currentUser = currentUser;
				$scope.meta = {dataset: {}, source: {}};
			}])
		.controller('datasetWizardStep1Controller', ['$scope', '$upload', '$http', '$timeout', '$q', '$state', '$modal', '$filter', 'ngTableParams', 'apiUrl',
			function($scope, $upload, $http, $timeout, $q, $state, $modal, $filter, ngTableParams, apiUrl) {
				$scope.fileUp = [];
				$scope.filesData = [];
				$scope.combinedColumns = [];
				$scope.$parent.wizardProgress = 15;
				$scope.$parent.step = '1';
				$scope.$parent.backButton = null;

				$scope.bytesToSize = function(bytes) {
				   if (bytes == 0) return '0 Octet';
				   var k = 1000;
				   var sizes = ['Octets', 'Kio', 'Mio', 'Gio'];
				   var i = Math.floor(Math.log(bytes) / Math.log(k));
				   return { value:(bytes / Math.pow(k, i)).toPrecision(3), m:sizes[i] };
				}

				function alreadyExist(fileName) {
					for(var i = 0, len = $scope.fileUp.length; i < len; i++) {
					    if ($scope.fileUp[i].data.name === fileName) {
					        return true;
					    }
					}
					return false;
				}

				function uploadFile(file) {
					$upload.upload({
						url: apiUrl + '/parse',
						method: 'POST',
						file: file.data,
						ignoreLoadingBar: true,
						timeout: file.canceller.promise,
						headers: {
							'public_key': $scope.$parent.currentUser.public_key
						}
					}).success(function(response, status, headers, config) {
						regroupAndAddFileData(response.data, file);
						file.status = -1;
					}).error(function(data, status, headers, config) {
						file.status = status;
					}).progress(function(evt) {
						file.progress = parseInt(100.0 * evt.loaded / evt.total);
					});
				}

				function addTwoFileCombi(combinedColumn, currentCol, fileNameNew, fileNameOld) {
					for(var i = 0, len = combinedColumn.length; i < len; i++) {
						if (combinedColumn[i].fileName === fileNameNew)
							return;
					}
					combinedColumn.push({fileName: fileNameNew, column: currentCol});
					for(var i = 0, len = combinedColumn.length; i < len; i++) {
						if (combinedColumn[i].fileName === fileNameOld)
							return;
					}
					combinedColumn.push({fileName: fileNameOld, column: currentCol});
				}

				function addNewCombiToCurrentCombi(currentCol, fileNameNew, fileNameOld) {
					for(var k = 0, len = $scope.combinedColumns.length; k < len; k++) {
						for(var p = 0, leni = $scope.combinedColumns[k].length; p < leni; p++) {
							if ($scope.combinedColumns[k][p].column === currentCol) {
								addTwoFileCombi($scope.combinedColumns[k], currentCol, fileNameNew, fileNameOld);
								return true;
							}
						}
					}
					return false;
				}

				function regroupAndAddFileData(data, file) {
					var currColumns = Object.keys(data[0]);
					for (var i = 0, len = $scope.filesData.length; i < len; i++) {
						var combi = $scope.filesData[i].columns.filter(function (val) {
							for(var j = 0, leni = currColumns.length; j < leni; j++) {
							    if (currColumns[j] === val) {
							        return true;
							    }
							    return false;
							}
						});
						for(var j = 0, lene = combi.length; j < lene; j++) {
							if (addNewCombiToCurrentCombi(combi[j], file.data.name, $scope.filesData[i].fileName))
								break;
							$scope.combinedColumns.push([{fileName: file.data.name, column: combi[j]},
														{fileName: $scope.filesData[i].fileName, column: combi[j]}]);
						}
					}
					$scope.filesData.push({
						fileName: file.data.name,
						columns: currColumns,
						datas: data
					});
				}

				$scope.onFileSelect = function($files) {
				    for (var i = 0; i < $files.length; i++) {
				    	if (alreadyExist($files[i].name))
				    		break;
						var file = {data: $files[i], progress: 0, status: -2, canceller: $q.defer()};
						$scope.fileUp.push(file);
						uploadFile(file);
					}
				};

				$scope.dragOverClass = function($event) {
					var items = $event.dataTransfer.items;
					var hasFile = false;
					if (items != null) {
						for (var i = 0 ; i < items.length; i++) {
							if (items[i].kind == 'file') {
								hasFile = true;
								break;
							}
						}
					} else {
						hasFile = true;
					}
					return hasFile ? "dragover" : "dragover-err";
				};

				$scope.removeFile = function($index) {
					for(var i = 0, len = $scope.filesData.length; i < len; i++) {
					    if ($scope.filesData[i].fileName === $scope.fileUp[$index].data.name) {
					        $scope.filesData.splice(i, 1);
					        break;
					    }
					}
					for (var i = $scope.combinedColumns.length - 1; i >= 0; i--) {
						$scope.combinedColumns[i] = $scope.combinedColumns[i].filter(function (val) {
							return val.fileName !== $scope.fileUp[$index].data.name;
						});
						if ($scope.combinedColumns[i].length === 0)
							$scope.combinedColumns.splice(i, 1);
					};
					$scope.fileUp.splice($index, 1);
				};

				$scope.abortUpload = function($index) {
					$scope.fileUp[$index].canceller.resolve();
					$scope.fileUp.splice($index, 1);
				};

				$scope.removeAllFile = function() {
					$scope.fileUp.map(function (item) { item.canceller.resolve() });
					$scope.fileUp = [];
					$scope.combinedColumns = [];
					$scope.filesData = [];
				};

				function checkIfAllCombined() {
					var fileList = [];
					for (var i = 0, len = $scope.combinedColumns.length; i < len; i++) {
						for (var j = 0, lenn = $scope.combinedColumns[i].length; j < lenn; j++) {
							if (fileList.indexOf($scope.combinedColumns[i][j].fileName) === -1) {
						        fileList.push($scope.combinedColumns[i][j].fileName);
						    }
						}
					}
					if (fileList.length !== $scope.filesData.length) {
						var str = "";
						for (var i = fileList.length === 0 ? 1 : 0, len = $scope.filesData.length; i < len; i++) {
							if (fileList.indexOf($scope.filesData[i].fileName) === -1) {
								str += '<li>' + $scope.filesData[i].fileName +'</li>';
							}
						}
						$modal({content: str,
								template: 'datasetWizardConfirmStep1Modal.html',
								placement: 'center',
								scope: $scope,
								animation: 'am-fade-and-scale',
								show: true});
						return false;
					}
					return true;
				}

				function combineFilesAndShow() {
					$scope.$parent.canContinue = function(){return false};
					$scope.combinedColumns = $scope.combinedColumns.filter(function (item) {
						return item.length > 1;
					});
					if ($scope.combinedColumns.length === 0) {
						takeFirstFileAndGo();
						return;
					}
					doCombineFiles();
					$state.go($scope.statePrefix + 'step2');
				};

				function popNeededFile(filename) {
					for (var i = $scope.filesData.length - 1; i >= 0; i--) {
						if ($scope.filesData[i].fileName === filename) {
							var neededFile = $scope.filesData[i];
							$scope.filesData.splice(i, 1);
							return neededFile;
						}
					};
					return null; //Should never go here
				}

				function findExistingColumn(file, column, value) {
					if (value === "")
						return -1; //Don't combine empty columns
					for (var i = 0, len = file.datas.length; i < len; i++) {
						if (file.datas[i][column] === value)
							return i;
					}
					return -1;
				}

				function mergeKnownColumns(fileRef, file2, colRef, col2) {
					for (var i = file2.datas.length - 1; i >= 0; i--) {
						var colId = findExistingColumn(fileRef, colRef, file2.datas[i][col2]);
						if (colId === -1)
							file2.datas[i][colRef] = file2.datas[i][col2];
						delete file2.datas[i][col2];
						mergeLine(fileRef.datas, colId, file2.datas, i);
						file2.datas.splice(i, 1);
					};
				}

				function mergeLine(datas1, i1, datas2, i2) {
					if (i1 === -1) {
						datas1.push(datas2[i2]);
					}
					else {
						for (var attrname in datas2[i2]) {
							var target = attrname;
							if (datas1[i1][attrname] && datas1[i1][attrname] !== ""
								&& (datas1[i1][attrname] !== datas2[i2][attrname]))
								target = attrname + "_2"; //TODO May do something better here
							datas1[i1][target] = datas2[i2][attrname];
						}
					}
				}

				function mergeColumns(file1, file2) {
					for (var i = file2.datas.length - 1; i >= 0; i--) {
						mergeLine(file1.datas, -1, file2.datas, i);
						file2.datas.splice(i, 1);
					};
				}

				function addToSourceData(currentFile, combinedCol, rowToCombine, notFirstGrp) {
					if ($scope.$parent.sourceData === null) {
						$scope.$parent.sourceData = currentFile;
						delete $scope.$parent.sourceData.fileName;
					}
					else if (notFirstGrp) {
						mergeColumns($scope.$parent.sourceData, currentFile);
					}
					else {
						mergeKnownColumns($scope.$parent.sourceData, currentFile, combinedCol, rowToCombine)
					}
				}

				function doCombineRow(rowsInfos) {
					var combinedCol = rowsInfos[0].column;
					for (var i = 0, len = rowsInfos.length; i < len; i++) {
						var rowToCombine = rowsInfos[i].column;
						var currentFile = popNeededFile(rowsInfos[i].fileName);
						addToSourceData(currentFile, combinedCol, rowToCombine, i === 0);
					}
				}

				function doCombineFiles() {
					for (var i = 0, len = $scope.combinedColumns.length; i < len; i++) {
						doCombineRow($scope.combinedColumns[i]);
					}
					$scope.$parent.sourceData.columns = Object.keys($scope.$parent.sourceData.datas[0]);
				}

				function takeFirstFileAndGo() {
					$scope.$parent.sourceData = $scope.filesData[0];
					$state.go($scope.statePrefix + 'step2');
				}

				$scope.continueModal = function(hide) {
					hide();
					$timeout(combineFilesAndShow, 100);
				};

				$scope.$parent.continueButton = function() {
					if ($scope.$parent.sourceData) {
						$state.go($scope.statePrefix + 'step2');
						return;
					}
					if ($scope.filesData.length === 1) {
						takeFirstFileAndGo();
						return;
					}
					if (!checkIfAllCombined())
						return;
					combineFilesAndShow();
				};

				$scope.$parent.canContinue = function() {
					return $scope.filesData.length > 0;
				};

				$scope.droppedRegroup = function(evt, data) {
					for (var i = $scope.combinedColumns.length - 1; i >= 0; i--) {
						$scope.combinedColumns[i] = $scope.combinedColumns[i].filter(function (val) {
							return !(val.fileName === data.fileName &&
								val.column === data.column);
						});
						if ($scope.combinedColumns[i].length === 0)
							$scope.combinedColumns.splice(i, 1);
					};
					$scope.combinedColumns.push([data]);
				};

				$scope.droppedTableRegroup = function(evt, data, index) {
					for (var i = $scope.combinedColumns.length - 1; i >= 0; i--) {
						if (i === index) {
							for (var j = $scope.combinedColumns[i].length - 1; j >= 0; j--) {
								if ($scope.combinedColumns[i][j].fileName === data.fileName) {
									$scope.combinedColumns[i].splice(j, 1);
									break;
								}
							}
							$scope.combinedColumns[i].push(data);
							continue;
						}
						$scope.combinedColumns[i] = $scope.combinedColumns[i].filter(function (val) {
							return !(val.fileName === data.fileName &&
								val.column === data.column);
						});
						if ($scope.combinedColumns[i].length === 0)
							$scope.combinedColumns.splice(i, 1);
					};
				}
			}])
		.controller('datasetWizardStep2Controller', ['$scope', '$state', '$modal', 'datasetModel',
			function($scope, $state, $modal, datasetModel) {
				if (!$scope.$parent.sourceData) {
					$state.go($scope.statePrefix + 'step1');
					return;
				}
				$scope.$parent.wizardProgress = 40;
				$scope.$parent.step = '2';
				$scope.$parent.backButton = function() {
					$scope.$parent.sourceData = null;
					$state.go($scope.statePrefix + 'step1');
				};
				//Trick pour le mode source, on désactive le bouton continue si on pas bind au moins 1 champ.
				$scope.atLeastOneBinding = false;
				$scope.$parent.canContinue = function() {
					return $scope.finalColumns.length > 0 && $scope.atLeastOneBinding;
				};

				if ($scope.$parent.wizardMode === 'dataset')
					$scope.finalColumns = []; //Struct : [ {title: '', inDataset: bool, oldColumns: ['', ''] } ]
				else if ($scope.$parent.wizardMode === 'source') {
					$scope.finalColumns = datasetModel.map(function(item) {
						return { title: item.name, inDataset: true, oldColumns: [] };
					})
				}

				$scope.tryAddColumn = function(evt, data) {
					//On ne peux pas ajouter de colonne en mode source (du moins pour le moment...)
					if ($scope.$parent.wizardMode !== 'dataset')
						return;
					$scope.currentCol = data;
					$scope.currentIndex = -1; //Workaround pour passer facilement l'index...
					$scope.focusInputRename = true;
					$modal({template: 'datasetWizardRenameColStep2Modal.html',
						placement: 'center',
						content: data,
						scope: $scope,
						animation: '',
						show: true});
				};

				$scope.confirmRenameModal = function(hide, currentColTitle) {
					c = currentColTitle.toString();
					if (c === "")
						return;
					hide();
					if ($scope.currentIndex === -1)
						$scope.addColumn(c);
					else
						$scope.renameColTitle(c);
				}

				$scope.addColumn = function(currentColTitle) {
					for (var i = $scope.finalColumns.length - 1; i >= 0; i--) {
						$scope.finalColumns[i].oldColumns = $scope.finalColumns[i].oldColumns.filter(function (val) {
							return val !== $scope.currentCol;
						});
						if ($scope.finalColumns[i].oldColumns.length === 0 && !$scope.finalColumns[i].inDataset)
							$scope.finalColumns.splice(i, 1);
					};
					$scope.finalColumns.push({title: currentColTitle, inDataset: false, oldColumns: [$scope.currentCol]});
					$scope.atLeastOneBinding = true;
				}

				$scope.combineColumn = function(evt, data, index) {
					for (var i = $scope.finalColumns.length - 1; i >= 0; i--) {
						$scope.finalColumns[i].oldColumns = $scope.finalColumns[i].oldColumns.filter(function (val) {
							return val !== data;
						});
						if (i === index) {
							$scope.finalColumns[index].oldColumns.push(data);
							continue;
						}
						if ($scope.finalColumns[i].oldColumns.length === 0 && !$scope.finalColumns[i].inDataset)
							$scope.finalColumns.splice(i, 1);
					};
					$scope.atLeastOneBinding = true;
				};

				$scope.tryCopyCol = function() {
					if ($scope.finalColumns.length > 0) {
						$modal({template: 'datasetWizardCopyColStep2Modal.html',
							placement: 'center',
							scope: $scope,
							animation: '',
							show: true});
					}
					else
						$scope.copyCol();
				};

				$scope.copyCol = function(hide) {
					if (hide)
						hide();
					$scope.finalColumns = $scope.$parent.sourceData.columns.map(function(item) {
						return {title: item, inDataset: false, oldColumns: [item]};
					});
					$scope.atLeastOneBinding = true;
				}

				$scope.removeAllCol = function() {
					if ($scope.$parent.wizardMode === 'dataset')
						$scope.finalColumns = [];
					else if ($scope.$parent.wizardMode === 'source') {
						for (var i = $scope.finalColumns.length - 1; i >= 0; i--) {
							if ($scope.finalColumns[i].inDataset)
								$scope.finalColumns[i].oldColumns = [];
							else
								$scope.finalColumns[i].splice(i, 1);
						}
					}
				};

				$scope.editColTitle = function(index) {
					$scope.currentIndex = index;
					$scope.focusInputRename = true;
					$modal({template: 'datasetWizardRenameColStep2Modal.html',
						placement: 'center',
						content: $scope.finalColumns[index].title,
						scope: $scope,
						animation: '',
						show: true});
				};

				$scope.renameColTitle = function(newTitle) {
					$scope.finalColumns[$scope.currentIndex].title = newTitle;
				}

				$scope.removeCol = function(index) {
					$scope.finalColumns.splice(index, 1);
				};

				function subPrepareNewColumnName(item) {
					for (var i = 0, len = $scope.finalColumns.length; i < len; i++) {
						for (var j = 0, lenn = $scope.finalColumns[i].oldColumns.length; j < lenn; j++) {
							if (item === $scope.finalColumns[i].oldColumns[j])
								return {oldName: item, newName: $scope.finalColumns[i].title }
						}
					}
					return false;
				}

				function prepareNewColumnName() {
					var newColumnName = [];
					for (var k = 0, len = $scope.$parent.sourceData.columns.length; k < len; k++) {
						var tmp = subPrepareNewColumnName($scope.$parent.sourceData.columns[k]);
						if (tmp)
							newColumnName.push(tmp);
					};
					return newColumnName;
				}

				function processNewColumns(newColumnsNames) {
					$scope.$parent.sourceDataFinal = $scope.$parent.sourceData.datas.map(function(line) {
						var newLine = {};
						for (i = 0, len = newColumnsNames.length; i < len; i++) {
							if (newLine[newColumnsNames[i].newName])
								newLine[newColumnsNames[i].newName] = newLine[newColumnsNames[i].newName] +
																" " + line[newColumnsNames[i].oldName];
																//TODO support de differents separateurs
							else
								newLine[newColumnsNames[i].newName] = line[newColumnsNames[i].oldName];
						}
						return newLine;
					});
				}

				function checkIfAllSet() {
					var notSet = $scope.finalColumns.filter(function(item) {
						return item.inDataset && !item.oldColumns.length;
					});
					if (notSet.length) {
						var str = "";
						for (var i = 0, len = notSet.length; i < len; i++) {
							str += '<li>' + notSet[i].title +'</li>';
						}
						$modal({template: 'datasetWizardConfirmNotAllSetStep2Modal.html',
							placement: 'center',
							content: str,
							scope: $scope,
							animation: '',
							show: true});
						return false;
					}
					return true;
				}

				$scope.continueModal = function(hide) {
					hide();
					$scope.ignoreCheckAllSet = true;
					$scope.$parent.continueButton();
				}

				$scope.$parent.continueButton = function() {
					if ($scope.$parent.wizardMode === 'source' && !$scope.ignoreCheckAllSet) {
						if (!checkIfAllSet())
							return;
					}
					var newColumnsNames = prepareNewColumnName();
					//TODO Check ici si identique
					processNewColumns(newColumnsNames);
					$state.go($scope.statePrefix + 'step3');
				};
			}])
		.controller('datasetWizardStep3Controller', ['$scope', '$state', '$filter', 'ngTableParams', '$modal',
			function($scope, $state, $filter, ngTableParams, $modal) {
				if (!$scope.$parent.sourceDataFinal) {
					$state.go($scope.statePrefix + 'step1');
					return;
				}
				$scope.$parent.wizardProgress = 60;
				$scope.$parent.step = '3';
				$scope.$parent.backButton = function() {
					$scope.$parent.sourceDataFinal = null;
					$state.go($scope.statePrefix + 'step2');
				};
				$scope.$parent.continueButton = function() { $state.go($scope.statePrefix + 'step4') };
				$scope.$parent.canContinue = function() { return true; };

				$scope.sourceDataCurrentColumns = Object.keys($scope.$parent.sourceDataFinal[0]);
				//Il n'y a pas forcement une colonne unique,
				//du coup angular genere un hashKey lors du ng-repeat. Ref : track by (ng-repeat)
				//Pour le moment, on l'enleve a la main...
				if ($scope.sourceDataCurrentColumns[$scope.sourceDataCurrentColumns.length - 1] == "$$hashKey")
					$scope.sourceDataCurrentColumns.pop();

			    $scope.tableParams = new ngTableParams({
			        page: 1,
			        count: 10
			    }, {
			        total: $scope.$parent.sourceDataFinal.length,
			        getData: function($defer, params) {
			            var filteredData = params.filter() ?
			                    $filter('filter')($scope.$parent.sourceDataFinal, params.filter()) :
			                    $scope.$parent.sourceDataFinal;
			            var orderedData = params.sorting() ?
			                    $filter('orderBy')(filteredData, params.orderBy()) :
			                    $scope.$parent.sourceDataFinal;

			            params.total(orderedData.length);
			            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
			        }
			    });

				$scope.applyRegexModal = function() {
					$modal({template: 'datasetWizardRegexStep3Modal.html',
						placement: 'center',
						scope: $scope,
						animation: '',
						show: true});
				};

				$scope.getRegexColumn = function() {
					return {
	            		'multiple': true,
	            		'simple_tags': true,
	            		'tags': $scope.sourceDataCurrentColumns,
	            		'placeholder': ""
        			};
				}

				$scope.confirmRegexModal = function(hide, data) {
					var columns = data.column;
					var regex = data.regex.toString();
					var regex2 = data.regex2.toString();
					if (columns.length == 0 || regex === "" || regex2 === "")
						return;
					hide();
					for (i = 0, len = columns.length; i < len; i++) {
						for (j = 0, len = $scope.$parent.sourceDataFinal.length; j < len; j++) {
							$scope.$parent.sourceDataFinal[j][columns[i]] = $scope.$parent.sourceDataFinal[j][columns[i]]
																				.replace(regex, regex2);
						}
					}
				}

				$scope.addColumnModal = function() {
					$scope.focusInputRename = true;
					$modal({template: 'datasetWizardAddColStep3Modal.html',
						placement: 'center',
						scope: $scope,
						animation: '',
						show: true});
				};

				$scope.confirmAddColModal = function(hide, data) {
					var title = data.title.toString();
					var value = data.value.toString();
					if (title === "")
						return;
					hide();
					$scope.sourceDataCurrentColumns.push(title);
					for (i = 0, len = $scope.$parent.sourceDataFinal.length; i < len; i++) {
						$scope.$parent.sourceDataFinal[i][title] = value;
					}
				}

			    $scope.sortTable = function(name) {
			    	var obj = {};
			    	obj[name] = $scope.tableParams.isSortBy(name, 'asc') ? 'desc' : 'asc';
			    	$scope.tableParams.sorting(obj);
			    }

			    $scope.filterTable = function(name) {
			    	var obj = {};
			    	obj[name] = 'text';
			    	return obj;
			    }
			}])
		.controller('datasetWizardStep4Controller', ['$scope', '$state', 'filterList', '$http',
			function($scope, $state, filterList, $http) {
				if (!$scope.$parent.sourceDataFinal) {
					$state.go($scope.statePrefix + 'step1');
				}
				$scope.$parent.wizardProgress = 80;
				$scope.$parent.step = '4';
				$scope.$parent.backButton = function() { $state.go($scope.statePrefix + 'step3'); };
				$scope.$parent.continueButton = function() { $state.go($scope.statePrefix + 'step5') };
				$scope.$parent.canContinue = function() {
					return true; //FIXME VERIFIER LES CHAMPS REQUIS !
				};
				$scope.$parent.endButton = null;

				$scope.filterList = filterList.data.results;
				$scope.dvisibility = [{val : 'Autoriser tout le monde à voir mes publications', id:'public'},
							{val:'N\'autoriser personne à voir mes publications', id:'private'}];
			    $scope.getLocation = function(val) {
			    	if (!val)
			    		return null;
					return $http.get(Routing.generate('datacity_public_api_place'), {
                		ignoreLoadingBar: true,
                		params: {
                    		q: val
                		}}).then(function(res) {
                			return res.data.results.map(function(item) { return item.name });
                	});
			    }
			}])
		.controller('datasetWizardStep5Controller', ['$scope', '$state', '$filter', 'ngTableParams',
													'DatasetFactory', '$http', 'datasetSlug', 'apiUrl',
			function($scope, $state, $filter, ngTableParams, DatasetFactory, $http, datasetSlug, apiUrl) {
				if (!$scope.$parent.sourceDataFinal) {
					$state.go($scope.statePrefix + 'step1');
				}
				$scope.$parent.wizardProgress = 100;
				$scope.$parent.step = '5';
				$scope.$parent.backButton = null;
				$scope.$parent.continueButton = null;

				$scope.sourceDataFinalColumns = Object.keys($scope.$parent.sourceDataFinal[0]);
				//Meme chose que au dessus puisque c'est un copié collé tout moche...
				if ($scope.sourceDataFinalColumns[$scope.sourceDataFinalColumns.length - 1] == "$$hashKey")
					$scope.sourceDataFinalColumns.pop();

			    $scope.tableParams = new ngTableParams({
			        page: 1,
			        count: 10
			    }, {
			        total: $scope.$parent.sourceDataFinal.length,
			        getData: function($defer, params) {
			            var filteredData = params.filter() ?
			                    $filter('filter')($scope.$parent.sourceDataFinal, params.filter()) :
			                    $scope.$parent.sourceDataFinal;
			            var orderedData = params.sorting() ?
			                    $filter('orderBy')(filteredData, params.orderBy()) :
			                    $scope.$parent.sourceDataFinal;

			            params.total(orderedData.length);
			            $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
			        }
			    });

			    $scope.sortTable = function(name) {
			    	var obj = {};
			    	obj[name] = $scope.tableParams.isSortBy(name, 'asc') ? 'desc' : 'asc';
			    	$scope.tableParams.sorting(obj);
			    }

			    $scope.filterTable = function(name) {
			    	var obj = {};
			    	obj[name] = 'text';
			    	return obj;
			    }

				$scope.$parent.endButton = function() {
					$state.go('datasetList');
				};

				function postSource(actualDatasetSlug) {
					$scope.datasetLink = Routing.generate('datacity_public_dataviewpage') + '/dataset/' + actualDatasetSlug;
					var data = {source: $scope.$parent.sourceDataFinal}
					data.model = $scope.sourceDataFinalColumns.map(function(item) {
						return {name: item, type: "Texte", mandatory: true, unique: true}; //TODO handle mandatory & unique
					});
					$http({
						method: 'POST',
						contentType: false,
        				processData: false,
        				data: data,
						url: apiUrl + '/' + actualDatasetSlug + '/source',
						headers: {
							'public_key': $scope.$parent.currentUser.public_key,
							'private_key': $scope.$parent.currentUser.private_key,
						}
					}).then(function(response) {
						//TODO Support d'erreur
						var tmp = {};
						tmp.metadata = $scope.$parent.meta.source;
						if ($scope.wizardMode === 'dataset') { //TODO REMOVE THIS LATER
								tmp.dataModel = $scope.sourceDataFinalColumns.map(function(item) { //TMP En attendant l'api (support model)...
								return {name: item, type: "Texte"}; //TODO Support type
							});
						}
						$http.post(Routing.generate('datacity_private_source_post', {slug: actualDatasetSlug}), tmp).then(function() {
							$scope.$parent.canEnd = true;
						});
					});
				}

				function postDataset() {
					DatasetFactory.post($scope.$parent.meta.dataset).then(function(data) {
						postSource(data.result);
					});
				}

				$scope.$parent.canEnd = false;
				if ($scope.wizardMode === 'dataset') {
					postDataset();
				}
				else if ($scope.wizardMode === 'source') {
					postSource(datasetSlug);
				}
		}])
})();