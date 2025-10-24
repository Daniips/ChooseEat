import { Restaurant } from "../types";

export const MOCK_RESTAURANTS: Restaurant[] = [
    { id: "r1", name: "La Bárbara", cuisine: ["argentinian"], price: 2, distanceKm: 1.2, rating: 4.3, openNow: true,  img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop" },
    { id: "r2", name: "Sushi Kumo",  cuisine: ["japanese", "sushi"], price: 3, distanceKm: 2.5, rating: 4.6, openNow: true,  img: "https://images.unsplash.com/photo-1553621042-f6e147245754?q=80&w=1600&auto=format&fit=crop" },
    { id: "r3", name: "Trattoria Roma", cuisine: ["italian"], price: 2, distanceKm: 0.9, rating: 4.2, openNow: false, img: "https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?auto=format&fit=crop&w=1040&h=1040&q=80" },
    { id: "r4", name: "Curry House",   cuisine: ["indian"], price: 1, distanceKm: 3.2, rating: 4.0, openNow: true,  img: "https://images.unsplash.com/photo-1617195737493-7f6bb68fc4b2?auto=format&fit=crop&w=1040&h=1040&q=80" },
    { id: "r5", name: "Burger Lab",    cuisine: ["american", "burger"], price: 2, distanceKm: 1.8, rating: 4.1, openNow: true,  img: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=1600&auto=format&fit=crop" }
];
