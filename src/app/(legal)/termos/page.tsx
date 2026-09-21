import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Page() {
  return (
    <LegalPage
      title="Termos de uso"
      sections={[
        { title: "Aceite", body: ["Ao usar o site e realizar compras, você concorda com estes termos. A loja é operada por [RAZÃO SOCIAL], CNPJ [CNPJ]."] },
        { title: "Cadastro", body: ["É necessário criar uma conta com dados verdadeiros para comprar. Você é responsável pela guarda da sua senha."] },
        { title: "Preços e estoque", body: ["Os preços e a disponibilidade podem mudar sem aviso. Em caso de erro evidente de preço ou de falta de estoque, entraremos em contato para oferecer alternativa ou reembolso."] },
        { title: "Pagamento", body: ["Aceitamos as formas de pagamento exibidas no checkout. O pedido é confirmado após a aprovação do pagamento, exceto na modalidade de pagamento na entrega, disponível apenas em áreas atendidas."] },
        { title: "Entrega", body: ["Os prazos e valores são calculados no checkout com base no CEP de destino e começam a contar após a confirmação do pagamento e o preparo do pedido."] },
        { title: "Propriedade intelectual", body: ["Textos, imagens e marcas do site pertencem à loja ou aos seus titulares e não podem ser copiados sem autorização."] },
        { title: "Foro", body: ["Fica eleito o foro do domicílio do consumidor para dirimir dúvidas decorrentes destes termos."] },
      ]}
    />
  );
}
