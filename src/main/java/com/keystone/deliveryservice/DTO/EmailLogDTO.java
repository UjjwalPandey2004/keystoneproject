package com.keystone.deliveryservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailLogDTO {

	public String RecipientEmail;
	public String subject;
	public String body;

	
}
