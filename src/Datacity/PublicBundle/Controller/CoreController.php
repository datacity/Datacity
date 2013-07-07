<?php

namespace Datacity\PublicBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;

class CoreController extends Controller
{
    public function homeAction()
    {
    	$response = $this->render('DatacityPublicBundle:Core:home.html.twig');
    	$response->setPublic();
    	$response->setMaxAge(600);
    	$response->setSharedMaxAge(600);
        return $response;
    }
}
