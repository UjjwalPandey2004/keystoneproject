package com.keystone.deliveryservice.Contoller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.keystone.deliveryservice.DTO.AuthResponseDTO;
import com.keystone.deliveryservice.DTO.LoginRequestDTO;
import com.keystone.deliveryservice.DTO.RegisterRquestDTO;
import com.keystone.deliveryservice.Service.UserAuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/user_auth")
@RequiredArgsConstructor
public class UserAuthController {

	@Autowired
	private UserAuthService userAuthService;
	
	@PostMapping("/register")
	public ResponseEntity<AuthResponseDTO>register(@RequestBody RegisterRquestDTO register){
		return ResponseEntity.ok(userAuthService.register(register));
	}
	@PostMapping("/login")
    public ResponseEntity<String>login(@RequestBody LoginRequestDTO login){
		userAuthService.login(login);
		return ResponseEntity.ok("Login Successfull");
		
	}
}