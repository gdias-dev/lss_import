import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Page() {
  return (
    <LegalPage
      title="Política de privacidade"
      sections={[
        { title: "Quem somos", body: ["Esta loja é operada por [RAZÃO SOCIAL], CNPJ [CNPJ]. Contato para assuntos de privacidade: [E-MAIL DE CONTATO]."] },
        { title: "Dados que coletamos", body: ["Nome, e-mail, telefone, CPF e endereço de entrega, necessários para criar sua conta, processar o pagamento, emitir nota fiscal e entregar seu pedido.", "Não armazenamos dados de cartão. O pagamento é processado diretamente pela operadora de pagamento."] },
        { title: "Para que usamos", body: ["Processar e entregar pedidos, emitir documentos fiscais, atender solicitações pelo WhatsApp e e-mail, prevenir fraudes e cumprir obrigações legais."] },
        { title: "Com quem compartilhamos", body: ["Operadora de pagamento, transportadoras e Correios, emissor de nota fiscal e provedores de hospedagem e e-mail, apenas no necessário para a prestação do serviço."] },
        { title: "Seus direitos (LGPD)", body: ["Você pode solicitar acesso, correção, exclusão dos seus dados e outras providências previstas no art. 18 da Lei 13.709/2018, pelo e-mail de contato acima."] },
        { title: "Cookies", body: ["Usamos apenas cookies essenciais para manter sua sessão e seu carrinho. Não usamos cookies de publicidade."] },
      ]}
    />
  );
}
