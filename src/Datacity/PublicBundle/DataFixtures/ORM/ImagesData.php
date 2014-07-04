<?php

namespace Datacity\PublicBundle\DataFixtures\ORM;

use Doctrine\Common\DataFixtures\AbstractFixture;
use Doctrine\Common\DataFixtures\OrderedFixtureInterface;
use Doctrine\Common\Persistence\ObjectManager;
use Datacity\PublicBundle\Entity\Image;

class ImagesData extends AbstractFixture implements OrderedFixtureInterface
{
	static public $imagesUrl = array (
			'http://www.businesscomputingworld.co.uk/wp-content/uploads/2012/08/Cool-City.jpg',
			'http://senseable.mit.edu/copenhagenwheel/pix_urbanData/data_02.jpg',
			'http://www.clandoustphotography.co.uk/images/banner_bridges1.jpg',
			'http://www.giornalettismo.com/wp-content/uploads/2012/12/screen-shot-2012-12-12-at-11-13-53-pm-770x310.png',
			'http://fr.rotterdam.info/data/offer/offerid1005/large/City-Racing-Rotterdam---Bavaria-City-Racing-133882027806.jpg',
			'http://wamu.org/sites/wamu.org/files/styles/headline_landscape/public/images/attach/08.02.13news-flickr-ocean-city.jpg?itok=gDxBsSWI',
			'http://us.123rf.com/400wm/400/400/tribalium123/tribalium1231210/tribalium123121000126/15686858-bombe-vieux-commencent-a-exploser-explosion-de-bandes-dessinees-bombe-style-ancien.jpg',
			'http://www.astrosurf.com/luxorion/Physique/bombe-mururoa1.jpg',
			'http://www.data.gouv.fr/img/logo.png',
			'http://opendata.montpelliernumerique.fr/IMG/siteon0.png?1390241326',
			'http://datarmor.cotesdarmor.fr/image/layout_set_logo?img_id=11509&t=1404490687738',
			'http://localhost/bundles/datacitypublic/img/logo2.png'
	);
	
	public function load(ObjectManager $manager)
	{
		$alt = array (
				'Premiere image Culture',
				'Seconde image Culture',
				'Premiere image Street',
				'Seconde image Street',
				'Premiere image Tourisme',
				'Seconde image Tourisme',
				'Premiere image ic',
				'Seconde image ic',
				'data.gouv.fr',
				'Montpellier Numérique',
				'Dat\'Armor',
				'Datacity'
		);
		
		foreach (self::$imagesUrl as $i => $url)
		{
			$image = new Image();
			$image->setUrl($url);
			$image->setAlt($alt[$i]);
			$manager->persist($image);
			$this->addReference('image-'.md5($url), $image);
    	}
		$manager->flush();
	}
	
	public function getOrder()
	{
		return 0;
	}
}
