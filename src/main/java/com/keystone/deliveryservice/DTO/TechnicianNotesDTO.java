package com.keystone.deliveryservice.DTO;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TechnicianNotesDTO {

    @Size(max = 4000, message = "Notes must be at most 4000 characters")
    private String notes;
}
