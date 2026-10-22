// Feature: ayasib-frontend-redesign (v2)
import { Icon } from "@/components/Icon";
import { t } from "@/lib/strings";

export function FooterNote() {
  return (
    <p className="footer-note">
      <Icon name="info" size={14} />
      {t.footer.note}
    </p>
  );
}
