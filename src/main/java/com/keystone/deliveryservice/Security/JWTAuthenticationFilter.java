package com.keystone.deliveryservice.Security;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JWTAuthenticationFilter extends OncePerRequestFilter{
	@Autowired
	private JWTUtil JwtUtil;
	
	@Autowired
	private CustomUserDetailsService customUserDetails;

	@Autowired
	private TokenKillingService tokenkill;
	
	
//	private final JWTUtil JwtUtil;
//	public  JWTAuthenticationFilter (JWTUtil JwtUtil) {
//		this.JwtUtil=jwiUtil;
//	
//	}

	public void doFilterInternal(HttpServletRequest request,
			                     HttpServletResponse response,
			                     FilterChain filterchain) throws ServletException,IOException{
		String header =request.getHeader("Authorization");
		String token = null;
		
		if(StringUtils.hasText(header) && header.startsWith("bearer")) {
			token = header.substring(7);
			
		}
		
		
		if (token!=null && JwtUtil.validateToken(token)) {
			 String UserEmail = JwtUtil.getUserEmail(token) ;
			
				UserDetails userdetails =customUserDetails.loaduserByUserEmail(UserEmail);	 
				UsernamePasswordAuthenticationToken auntication =
						    new UsernamePasswordAuthenticationToken(userdetails,null,userdetails.getAuthorities());
				auntication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
				SecurityContextHolder.getContext().setAuthentication(auntication);
		}
		String token1 = JwtUtil.extractToken(header);
		
		if(token!= null) {
			if(tokenkill.isblockToken(token1)) {
				response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
				response.getWriter().write("token Got Expire");
				return;
			}
		}
		
		filterchain.doFilter(request, response);
		
	}
      	
}
