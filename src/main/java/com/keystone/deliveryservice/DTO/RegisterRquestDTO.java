package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class RegisterRquestDTO {

	public String UserName;
	public String UserEmail;
	public String password;
	public String phone;
	public Role role;
	public String UserEmail() {
		// TODO Auto-generated method stub
		return null;
	}
	
}
