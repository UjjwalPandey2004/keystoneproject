package com.keystone.deliveryservice.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
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
		throw new  RuntimeException("Customer already exist");
	}
		customer.setActive(true);
		customer.setCreatedAt(LocalDateTime.now());
		
		return cusREPO.save(customer);
		
	}
	@Override
	public Customer updateCustomer(Long id , Customer customer) {
		
		Customer existingCustomer = cusREPO.findById(id)
		        .orElseThrow(() -> new RuntimeException("Customer not found"));
				
		  existingCustomer.setCompanyName(customer.getCompanyName());
		    existingCustomer.setEmail(customer.getEmail());
		    existingCustomer.setPhone(customer.getPhone());
		    existingCustomer.setAddress(customer.getAddress());
		    existingCustomer.setActive(customer.isActive());
		
	    
	        return cusREPO.save(existingCustomer);
 		}
	@Override
	 public Customer getCustomer(Long id) {
		
		return cusREPO.findById(id).orElseThrow(()-> new RuntimeException("customer not found"));			
     }
	
	@Override
	 public List<Customer>getAllCustomer() {
		return  cusREPO.findAll();
		 
      }
	
	@Override
	 public void deleteCustomer( String email) {
		Customer Custom = cusREPO.findByEmail(email)
				.orElseThrow(()-> new RuntimeException("customer not found"));
	
		cusREPO.delete(Custom);
		
	}
}	 