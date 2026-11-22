package tn.ferraille.shipping;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ShippingController {

    private final ShippingService shippingService;

    @GetMapping("/api/shipping/options")
    public List<ShippingService.CarrierOption> options() {
        return shippingService.options();
    }
}
