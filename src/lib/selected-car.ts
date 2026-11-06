// Cookie (e não só localStorage) porque o servidor precisa ler a seleção para
// renderizar dashboard e relatórios já com os dados do carro certo.
// Fica fora do car-provider ('use client'): importada de lá, a constante chegava
// ao servidor como referência de cliente, não como texto, e o cookie nunca era lido.
export const SELECTED_CAR_COOKIE = 'autocare_car_id';
