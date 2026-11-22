package tn.ferraille.listing;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VehicleFit {

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    @Column(name = "year_from")
    private Integer yearFrom;

    @Column(name = "year_to")
    private Integer yearTo;

    public boolean matches(String make, String model, Integer year) {
        if (make != null && !this.make.equalsIgnoreCase(make)) {
            return false;
        }
        if (model != null && !this.model.equalsIgnoreCase(model)) {
            return false;
        }
        if (year == null) {
            return true;
        }
        return (yearFrom == null || yearFrom <= year) && (yearTo == null || yearTo >= year);
    }
}
