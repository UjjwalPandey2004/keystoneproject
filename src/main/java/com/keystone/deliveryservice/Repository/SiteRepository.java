package com.keystone.deliveryservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.Site;

@Repository

public interface SiteRepository  extends JpaRepository<Site,Long> {

	Limit<Site>findByCustomerId(Long Customerid);
	
}
