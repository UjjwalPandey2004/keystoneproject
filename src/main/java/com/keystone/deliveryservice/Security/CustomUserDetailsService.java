package com.keystone.deliveryservice.Security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;

@Service
public class CustomUserDetailsService {


@Autowired	
private UserAuthRepository userRepo;

public UserDetails loaduserByUserEmail(String userEmail) {
	
    UserAuth user = userRepo.findByUserEmail(userEmail)
    		.orElseThrow(() -> new RuntimeException("User not found"));
	
	 return new User(
             user.getUserEmail(),
             user.getPassword(),
             null);
}
}
