package com.keystone.deliveryservice.DTO;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SiteResponseDTO {
    private Long id;
    private Long customerId;
    private String siteName;
    private String buildingName;
    private Long roomNo;
    private String address;
    private String city;
    private String state;
    private String country;
    private Long zipcode;
}
