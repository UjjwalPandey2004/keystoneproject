package com.keystone.deliveryservice.Service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.keystone.deliveryservice.Entity.Site;

public interface SiteService {

	public Site createSite (Site site);
	public Site UpdateSite(Long Id, Site site);
	public Site getSite(Long Id);
	public List<Site>getSiteByCustomer(Long CustomerID);
	public Page<Site> searchSitesByCustomer(Long customerId, String query, Pageable pageable);
	public void deleteSite(Long Id);
	
}
