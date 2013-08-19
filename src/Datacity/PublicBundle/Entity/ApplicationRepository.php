<?php

namespace Datacity\PublicBundle\Entity;

use Doctrine\ORM\EntityRepository;

/**
 * ApplicationRepository
 *
 * This class was generated by the Doctrine ORM. Add your own custom
 * repository methods below.
 */
class ApplicationRepository extends EntityRepository
{
	public function getAppsWithImg()
	{
		$qb = $this->createQueryBuilder('a')
		->leftJoin('a.images', 'i')
		->addSelect('i');
		
		return $qb->getQuery()
		->getResult();
	}
}
