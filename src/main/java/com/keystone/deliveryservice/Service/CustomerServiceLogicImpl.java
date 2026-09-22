package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Repository.CustomerRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomerServiceLogicImpl implements CustomerServiceLogic{

	@Autowired
	private CustomerRepository cusREPO;
	
	@Override
	public Customer createCustomer(Customer customer) {

	if(cusREPO.existsByEmail(customer.getEmail())) {
		throw new IllegalArgumentException("Customer with this email already exists");
	}
		customer.setActive(true);
		customer.setCreatedAt(LocalDateTime.now());
		
		return cusREPO.save(customer);
		
	}
	@Override
	public Customer updateCustomer(Long id , Customer customer) {
		
		Customer existingCustomer = cusREPO.findById(id)
		        .orElseThrow(() -> new IllegalArgumentException("Customer not found with ID: " + id));
				
		  existingCustomer.setCompanyName(customer.getCompanyName());
		  existingCustomer.setContactPerson(customer.getContactPerson());
		    existingCustomer.setEmail(customer.getEmail());
		    existingCustomer.setPhone(customer.getPhone());
		    existingCustomer.setAddress(customer.getAddress());
		    existingCustomer.setActive(customer.isActive());
		
	    
	        return cusREPO.save(existingCustomer);
 		}
	@Override
	 public Customer getCustomer(Long id) {
		
		return cusREPO.findById(id).orElseThrow(()-> new IllegalArgumentException("Customer not found with ID: " + id));
     }
	
	@Override
	 public Page<Customer> searchCustomers(String query, Pageable pageable) {
		if (query == null || query.isBlank()) {
			return cusREPO.findAll(pageable);
		}
		String term = query.trim();
		return cusREPO.findByCompanyNameContainingIgnoreCaseOrContactPersonContainingIgnoreCaseOrEmailContainingIgnoreCase(
				term, term, term, pageable);
		 
      }
	
	@Override
	 public void deleteCustomer( String email) {
		Customer Custom = cusREPO.findByEmail(email)
				.orElseThrow(()-> new IllegalArgumentException("Customer not found with email: " + email));
	
		cusREPO.delete(Custom);
		
	}
}
