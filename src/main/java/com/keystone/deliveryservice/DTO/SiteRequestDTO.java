package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SiteRequestDTO {
    @NotBlank @Size(max = 150)
    private String siteName;

    @Size(max = 100)
    private String buildingName;

    @Positive
    private Long roomNo;

    @NotBlank @Size(max = 1000)
    private String address;

    @NotBlank @Size(max = 100)
    private String city;

    @NotBlank @Size(max = 100)
    private String state;

    @NotBlank @Size(max = 100)
    private String country;

    @Positive
    private Long zipcode;
}
