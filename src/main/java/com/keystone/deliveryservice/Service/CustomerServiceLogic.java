package com.keystone.deliveryservice.Service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.keystone.deliveryservice.Entity.Customer;

public interface CustomerServiceLogic{

	Customer createCustomer(Customer customer);
	Customer updateCustomer(Long id , Customer customer);
	Customer getCustomer (Long id);
	Page<Customer> searchCustomers(String query, Pageable pageable);
		
	void deleteCustomer(String email);
	
}
