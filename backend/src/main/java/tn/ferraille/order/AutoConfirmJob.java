package tn.ferraille.order;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AutoConfirmJob {

    private final OrderService orderService;

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT1M")
    public void run() {
        int count = orderService.autoCompleteDelivered();
        if (count > 0) {
            log.info("{} commande(s) confirmée(s) automatiquement", count);
        }
    }
}
