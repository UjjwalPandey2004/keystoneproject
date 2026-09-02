package com.keystone.deliveryservice.Service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Repository.SiteRepository;
import com.keystone.deliveryservice.Repository.customerRepository;

@Service
public abstract class SiteServiceImpl implements SiteService {
	
	@Autowired
	private SiteRepository siteRepo;
	
	@Autowired 
	private customerRepository customerRepo;
	public Site createSite(Site site) {

	    Customer customer = customerRepo
	            .findById(site.getCustomer().getId())
	            .orElseThrow(() -> new RuntimeException("Customer not found"));

	    site.setCustomer(customer);

	    return siteRepo.save(site);
	}

	public Site update(Long Id , Site siteSetails) {
	
	Site siteRepo = siteRepo.findByid(id)
			.orElseThrow(()-> new RuntimeException("site not found)");
			
			Site.setBuildingName(Sitesetails.getBulidingName());
			Site.setAddress(SiteSetails.getAddress);
			Site.setRoomno(Sitesetails.getRoomNo());
			Site.setState(Sitesetails.getstate());
			Site.setcountry(Sitesetails.getcountry());
			Site.setzipcode(Sitesetails.getzipcode());
			
			if(sitesetails.getcustomer()  != null) {
				
				Customer customer =customerRepo.findById(Id)
						.orElseThrow(()-> new RuntimeException("customer not found"));
						
					Site.setCustomer(customer);
			}
			return siteRepo.save();
			}
            	
}
	
