package com.keystone.deliveryservice.Entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="Site")

@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder

public class Site {
 
	@jakarta.persistence.Id
	@GeneratedValue(strategy=GenerationType.IDENTITY)
	 private Long Id;
	 
	 
	 private String SiteName;
	 private String buildingName;
	 private Long roomNo;
	 private String address;
	 private String City;
	 private String State;
	 private String Country;
	 private Long Zipcode;
	 
	 @ManyToOne(fetch=FetchType.LAZY)
	 @JoinColumn(name="customer_id")
	 private Customer customer;

	public Long getId() {
		return Id;
	}

	public void setId(Long id) {
		Id = id;
	}

	public String getSiteName() {
		return SiteName;
	}

	public void setSiteName(String siteName) {
		SiteName = siteName;
	}

	public String getBuildingName() {
		return buildingName;
	}

	public void setBuildingName(String buildingName) {
		this.buildingName = buildingName;
	}

	public Long getRoomNo() {
		return roomNo;
	}

	public void setRoomNo(Long roomNo) {
		this.roomNo = roomNo;
	}

	public String getAddress() {
		return address;
	}

	public void setAddress(String address) {
		this.address = address;
	}

	public String getCity() {
		return City;
	}

	public void setCity(String city) {
		City = city;
	}

	public String getState() {
		return State;
	}

	public void setState(String state) {
		State = state;
	}

	public String getCountry() {
		return Country;
	}

	public void setCountry(String country) {
		Country = country;
	}

	public Long getZipcode() {
		return Zipcode;
	}

	public void setZipcode(Long zipcode) {
		Zipcode = zipcode;
	}

	public Customer getCustomer() {
		return customer;
	}

	public void setCustomer(Customer customer) {
		this.customer = customer;
	}
	 
	 
}
