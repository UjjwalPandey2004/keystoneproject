package com.keystone.deliveryservice.Service;

import java.util.List;

import com.keystone.deliveryservice.Entity.Site;

public interface SiteService {

	public Site createSite (Site site);
	public Site UpdateSite(Long Id, Site site);
	public Site getSite(Long Id);
	public List<Site>getSiteByCustomer(Long CustomerID);
	public void deleteSite(Long Id);
	
}
