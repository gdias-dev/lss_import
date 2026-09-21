import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Trocas e devoluções" };

export default function Page() {
  return (
    <LegalPage
      title="Trocas e devoluções"
      sections={[
        { title: "Direito de arrependimento", body: ["Em compras feitas pelo site, você pode desistir da compra em até 7 dias corridos após o recebimento, conforme o art. 49 do Código de Defesa do Consumidor. O produto deve estar lacrado, sem uso e na embalagem original."] },
        { title: "Produto com defeito ou divergente", body: ["Se o produto chegar com defeito, avaria ou diferente do pedido, avise em até 30 dias do recebimento pelo WhatsApp ou e-mail, com fotos, para providenciarmos troca ou reembolso."] },
        { title: "Como solicitar", body: ["Entre em contato pelos canais da loja informando o número do pedido. Orientaremos o envio de volta e o prazo de análise."] },
        { title: "Reembolso", body: ["O valor é devolvido pela mesma forma de pagamento utilizada, após o recebimento e a conferência do produto."] },
      ]}
    />
  );
}
