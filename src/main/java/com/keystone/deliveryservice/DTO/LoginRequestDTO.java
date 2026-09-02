package com.keystone.deliveryservice.DTO;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginRequestDTO {

	public String UserEmail;
    public String password;
 
}
