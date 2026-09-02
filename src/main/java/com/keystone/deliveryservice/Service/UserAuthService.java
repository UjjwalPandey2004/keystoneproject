package com.keystone.deliveryservice.Service;

import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.keystone.deliveryservice.DTO.AuthResponseDTO;
import com.keystone.deliveryservice.DTO.ForgotPasswordDTO;
import com.keystone.deliveryservice.DTO.LoginRequestDTO;
import com.keystone.deliveryservice.DTO.RegisterRquestDTO;
import com.keystone.deliveryservice.DTO.ResetPasswordDTO;
import com.keystone.deliveryservice.Entity.UserAuth;
import com.keystone.deliveryservice.Repository.UserAuthRepository;
import com.keystone.deliveryservice.Security.JWTUtil;
import com.keystone.deliveryservice.Security.TokenKillingService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor

public class UserAuthService {

	@Autowired
	private UserAuthRepository userAuthRepo;
	
	@Autowired 
	private JWTUtil jwtUtil;
	
	@Autowired
	private PasswordEncoder passwordEncoder;
	
	@Autowired 
	private EmailLogService emailLogService;
	
//	@Autowired 
//	private  tokenKill;
	
	@Autowired
	private TokenKillingService tokenKill;

   // AuthResponse method	
	public AuthResponseDTO register(RegisterRquestDTO register) {
		
		Optional<UserAuth> existingUser =
		        userAuthRepo.findByUserEmail(register.UserEmail());
//				   .orElseThrow(() -> new RuntimeException("user not found"));
		  if(existingUser.isPresent()) {
			  throw new RuntimeException("user already exist");
		  }
		
		UserAuth user = new UserAuth();
		user.setUserName(register.UserName);
		user.setUserEmail(register.UserEmail);
		user.setPassword(passwordEncoder.encode(register.password));
		user.setPhone(register.phone);
	    user.setRole(register.role);
	    
	    userAuthRepo.save(user);
	    
	    String token = jwtUtil.generateToken(user);
	    		return new AuthResponseDTO(token,"Register Successfull");
	}    
	//login method
	
	public String login(LoginRequestDTO login) {
		
		UserAuth uset= userAuthRepo.findByUserEmail(login.UserEmail)
				.orElseThrow(() -> new RuntimeException("user not found"));
		
		if(!passwordEncoder.matches(login.password, uset.getPassword())) {
			throw new RuntimeException("invalid credentials");
			
		}
		
		return jwtUtil.generateToken(uset);
		
	}
	public void forgotPassword(ForgotPasswordDTO forwardPassword) {
		
		UserAuth user = 
				userAuthRepo.findByUserEmail(forwardPassword.UserEmail)
				.orElseThrow(()-> new RuntimeException("user not found"));
		
		String token = UUID.randomUUID().toString();
	
		user.setResettoken(token);
		user.setTokenExpireTime(new Date(System.currentTimeMillis()+ 10*60*1000));
		
		userAuthRepo.save(user);
		
		emailLogService.sendResetPasswordMail(forwardPassword.UserEmail, token);
	}
	public void resetPassword(ResetPasswordDTO resetPassword) {
		
		UserAuth uset= userAuthRepo.findByUserEmail(resetPassword.Token)
				.orElseThrow(() -> new RuntimeException("invalid token"));
		
		if(uset.getTokenExpireTime().before(new Date())) {
			throw new RuntimeException("link Expire");
		}
		uset.setPassword(passwordEncoder.encode(resetPassword.newpassword));
        uset.setResettoken(null);
        uset.setTokenExpireTime(null);
        
        userAuthRepo.save(null);
	}
	
	public String logout(HttpServletRequest request) {

	    String header = request.getHeader("Authorization");

	    if (header == null || !header.startsWith("Bearer ")) {
	        return "Authorization Header Missing";
	    }

	    String token = jwtUtil.extractToken(header);

	    if (token != null) {
	        tokenKill.blockTokenProcess(token);
	    }

	    return "Logged out Successfully";
	}
	
}

