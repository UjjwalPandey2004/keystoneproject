package com.keystone.deliveryservice.DTO;

import lombok.*;



@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResetPasswordDTO {

	public String Token;
	public String newpassword;
	
}
