package com.keystone.deliveryservice.Service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Site;
import com.keystone.deliveryservice.Repository.SiteRepository;
import com.keystone.deliveryservice.Repository.CustomerRepository;

@Service
@Transactional
public class SiteServiceImpl implements SiteService {

    @Autowired
    private SiteRepository siteRepo;

    @Autowired
    private CustomerRepository customerRepo;

    @Override
    public Site createSite(Site site) {
        if (site.getCustomer() == null || site.getCustomer().getId() <= 0) {
            throw new IllegalArgumentException("A site must belong to a valid customer");
        }

        Customer customer = customerRepo.findById(site.getCustomer().getId())
                .orElseThrow(() -> new IllegalArgumentException("Customer not found with ID: " + site.getCustomer().getId()));

        site.setCustomer(customer);
        return siteRepo.save(site);
    }

    @Override
    public Site UpdateSite(Long id, Site siteDetails) {
        Site site = siteRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Site not found with ID: " + id));

        site.setSiteName(siteDetails.getSiteName());
        site.setBuildingName(siteDetails.getBuildingName());
        site.setAddress(siteDetails.getAddress());
        site.setRoomNo(siteDetails.getRoomNo());
        site.setCity(siteDetails.getCity());
        site.setState(siteDetails.getState());
        site.setCountry(siteDetails.getCountry());
        site.setZipcode(siteDetails.getZipcode());

        if (siteDetails.getCustomer() != null && siteDetails.getCustomer().getId() > 0) {
            Customer customer = customerRepo.findById(siteDetails.getCustomer().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Customer not found with ID: " + siteDetails.getCustomer().getId()));
            site.setCustomer(customer);
        }

        return siteRepo.save(site);
    }

    @Override
    @Transactional(readOnly = true)
    public Site getSite(Long id) {
        return siteRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Site not found with ID: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<Site> getSiteByCustomer(Long customerId) {
        return siteRepo.findByCustomerId(customerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<Site> searchSitesByCustomer(Long customerId, String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            return siteRepo.findByCustomerId(customerId, pageable);
        }
        return siteRepo.searchByCustomerId(customerId, query.trim(), pageable);
    }

    @Override
    public void deleteSite(Long id) {
        Site site = siteRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Site not found with ID: " + id));
        siteRepo.delete(site);
    }
}
