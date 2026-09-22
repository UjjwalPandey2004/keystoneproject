package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.ENUM.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponseDTO {

    private String token;
    private String type = "Bearer";
    private String email;
    private String name;
    private Role role;
    private String message;

    public AuthResponseDTO(String token, String message) {
        this.token = token;
        this.type = "Bearer";
        this.message = message;
    }

    public AuthResponseDTO(String token, String email, String name, Role role, String message) {
        this.token = token;
        this.type = "Bearer";
        this.email = email;
        this.name = name;
        this.role = role;
        this.message = message;
    }
}
