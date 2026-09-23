package com.keystone.deliveryservice.Repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.Site;

@Repository

public interface SiteRepository  extends JpaRepository<Site,Long> {

	List<Site>findByCustomerId(Long Customerid);
	Page<Site> findByCustomerId(Long customerId, Pageable pageable);

	@Query("""
			select s from Site s
			where s.customer.id = :customerId
			and (lower(s.SiteName) like lower(concat('%', :query, '%'))
			  or lower(s.address) like lower(concat('%', :query, '%'))
			  or lower(s.City) like lower(concat('%', :query, '%')))
			""")
	Page<Site> searchByCustomerId(@Param("customerId") Long customerId,
			@Param("query") String query, Pageable pageable);
	
}
