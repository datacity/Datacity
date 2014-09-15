(function() {
	var app = angular
		.module('app', [
			'mgcrea.ngStrap',
			'ui.router',
			'ngGrid',
			'ngSanitize',
			'angularFileUpload',
			'angular-loading-bar'
		])
        .run(['$rootScope', '$state', '$stateParams',
            function ($rootScope,   $state,   $stateParams) {
                $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
                    $rootScope.pageTitle = toState.title;
                    $rootScope.pageDescription = toState.description;
                    $rootScope.pageUrl = toState.url;
                });
            }
        ])
		.factory('$templateCache', ['$cacheFactory', '$http', '$injector', function($cacheFactory, $http, $injector) {
		  var cache = $cacheFactory('templates');
		  var allTplPromise;

		  return {
		    get: function(url) {
		      var fromCache = cache.get(url);

		      if (fromCache) {
		        return fromCache;
		      }

		      if (!allTplPromise) {
		        allTplPromise = $http.get(Routing.generate('datacity_private_partials')).then(function(response) {
		          $injector.get('$compile')(response.data);
		          return response;
		        });
		      }

		      return allTplPromise.then(function(response) {
		        return {
		          status: response.status,
		          config: { ignoreLoadingBar: false }, //trick for the loading bar
		          data: cache.get(url)
		        };
		      });
		    },

		    put: function(key, value) {
		      cache.put(key, value);
		    }
		  };
		}])
		.config(['$interpolateProvider', '$urlRouterProvider', '$stateProvider',
			function($interpolateProvider, $urlRouterProvider, $stateProvider) {
				//$interpolateProvider.startSymbol('{[{').endSymbol('}]}');
				$urlRouterProvider.otherwise('/');
				$stateProvider
				//Page d'accueil utilisateur
				.state('homeUser', {
                    title: 'Mon compte',
                    description: '',
					url: '/',
					templateUrl: 'userHome.html',
					controller: ['$scope', '$state', function($scope, $state) {
			        	$scope.$state = $state;
			     	}]
				})
                //Operations liées aux dataset.
				.state("datasetList", {
                	url: "/datasets",
                	templateUrl: 'userDatasets.html',
                    title: 'Vos jeux de données',
                    description: 'Ajouter/Gerer vos jeux de données',
					controller: ['$scope', 'currentUser', function($scope, currentUser) {
			        	$scope.user = currentUser;
			     	}],
					resolve: {
						currentUser: ['UserFactory', function(UserFactory) {
							//TODO Récuperer uniquement les jeux de données de l'user
							return UserFactory.getUserFromSession().then(function(data) {
				 				return data.user;
				 			});
						}]
					}
               	})
				.state('editDS', {
                    title: 'Edition',
                    description: 'Editer vos jeux de données',
					url: '/dataset/edit/:slug',
					templateUrl: 'formDataSet.html',
					controller: 'datasetController',
					resolve: {
						operation: function() {return 'edit'},
						licenses: ['DatasetFactory', function(DatasetFactory) {
							return DatasetFactory.getLicences();
						}],
						dataset: ['DatasetFactory', '$stateParams', function(DatasetFactory, $stateParams) {
							return DatasetFactory.get($stateParams.slug);
						}]
					}
				})
				.state('addDS', {
                    title: 'Ajout',
                    description: 'Ajouter un jeu de données',
					url: '/dataset/add',
					templateUrl: 'formDataSet.html',
					controller: 'datasetController',
					resolve: {
						operation: function() {return 'create'},
						licenses: ['DatasetFactory', function(DatasetFactory) {
							return DatasetFactory.getLicences();
						}],
						dataset: function() { return {} }
					}
				})
				.state('deleteDS', {
                    title: 'Suppression',
                    description: 'Suppression de jeux de données',
					url: '/dataset/delete/:slugDataset',
					controller: 'datasetController',
					resolve: {
						operation: function() {return 'delete' },
						licenses: ['DatasetFactory', function(DatasetFactory) {
							return DatasetFactory.getLicences();
						}],
						dataset: function() { return {} }
					}
				})
				//Operations liées aux sources
				.state('addSource', {
                    title: 'Ajout',
                    description: 'Ajouter une source',
					url: '/source/add/:slugDataset',
					templateUrl: 'formSource.html',
					controller: 'sourceController',
					resolve: {
						operation: function() {return 'create'}
					}
				})
				.state('editSource', {
                    title: 'Edition',
                    description: 'Editer vos sources',
					url: '/source/edit/:slugDataset/:id',
					templateUrl: 'formSource.html',
					controller: 'sourceController',
					resolve: {
						operation: function() {return 'edit'}
					}
				})
				//Operations liées à l'utilisateur
				.state('showUser', {
                    title: 'Votre Profil',
                    description: 'Changez vos informations personnelles',
					url: '/user/show',
					templateUrl: 'userInfo.html',
					controller: 'userController',
					resolve: {
						currentUser: ['UserFactory', function(UserFactory) {
							return UserFactory.getUserFromSession().then(function(data) {
				 				return data.user;
				 			});
						}]
					}
				})
                .state("showUser.mainView", {
                	url: "/mainView",
                	templateUrl: 'userOverviewTab.html',
                    title: 'Votre Profil',
                    description: 'Changez vos informations personnelles'
                })
                .state("showUser.settings", {
                	url: "/settings",
                	templateUrl: 'userAccount.html',
                    title: 'Votre Profil',
                    description: 'Changez vos informations personnelles'
                })
                .state("showUser.settings.profileSettings", {
                	url: "/profile",
                	templateUrl: 'profileTab.html',
                    title: 'Votre Profil',
                    description: 'Changez vos informations personnelles'
                })
                .state("showUser.settings.pictureSettings", {
                	url: "/picture",
                	templateUrl: 'pictureTab.html',
                	title: 'Votre Profil',
                	description: 'Changez vos informations personnelles'
                })
                .state("showUser.settings.passwordSettings", {
                	url: "/password",
                	templateUrl: 'passwordTab.html',
                    title: 'Votre Profil', description: 'Changez vos informations personnelles'
                });
	    }]);
})();