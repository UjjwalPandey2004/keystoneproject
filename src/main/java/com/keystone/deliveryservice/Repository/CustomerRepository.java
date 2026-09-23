package com.keystone.deliveryservice.Repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.keystone.deliveryservice.Entity.Customer;

@Repository

public interface CustomerRepository  extends JpaRepository<Customer, Long>{

	Optional<Customer>findByEmail(String email);
	boolean existsByEmail(String email);
	Page<Customer> findByCompanyNameContainingIgnoreCaseOrContactPersonContainingIgnoreCaseOrEmailContainingIgnoreCase(
			String companyName, String contactPerson, String email, Pageable pageable);
}
