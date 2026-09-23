package com.keystone.deliveryservice.DTO;

import com.keystone.deliveryservice.Entity.Customer;
import com.keystone.deliveryservice.Entity.Site;

public final class ApiDtoMapper {
    private ApiDtoMapper() {}

    public static Customer toCustomerEntity(CustomerRequestDTO dto) {
        return Customer.builder()
                .companyName(dto.getCompanyName())
                .contactPerson(dto.getContactPerson())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .active(dto.getActive() == null || dto.getActive())
                .build();
    }

    public static CustomerResponseDTO toCustomerResponse(Customer customer) {
        return CustomerResponseDTO.builder()
                .id(customer.getId())
                .companyName(customer.getCompanyName())
                .contactPerson(customer.getContactPerson())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .address(customer.getAddress())
                .active(customer.isActive())
                .createdAt(customer.getCreatedAt())
                .build();
    }

    public static Site toSiteEntity(SiteRequestDTO dto) {
        return Site.builder()
                .SiteName(dto.getSiteName())
                .buildingName(dto.getBuildingName())
                .roomNo(dto.getRoomNo())
                .address(dto.getAddress())
                .City(dto.getCity())
                .State(dto.getState())
                .Country(dto.getCountry())
                .Zipcode(dto.getZipcode())
                .build();
    }

    public static SiteResponseDTO toSiteResponse(Site site) {
        return SiteResponseDTO.builder()
                .id(site.getId())
                .customerId(site.getCustomer() == null ? null : site.getCustomer().getId())
                .siteName(site.getSiteName())
                .buildingName(site.getBuildingName())
                .roomNo(site.getRoomNo())
                .address(site.getAddress())
                .city(site.getCity())
                .state(site.getState())
                .country(site.getCountry())
                .zipcode(site.getZipcode())
                .build();
    }
}
