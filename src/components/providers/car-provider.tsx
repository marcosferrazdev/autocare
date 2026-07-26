'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './auth-provider';

interface Car {
  id: string;
  brand: string;
  model: string;
  yearManufacture: number;
  yearModel: number;
  plate: string | null;
  color: string | null;
  fuelType: string;
  engine: string | null;
  currentMileage: number;
  nickname: string | null;
  notes: string | null;
}

interface CarContextType {
  cars: Car[];
  selectedCar: Car | null;
  selectedCarId: string | null;
  setSelectedCarId: (id: string | null) => void;
  loading: boolean;
  refreshCars: () => Promise<void>;
}

const CarContext = createContext<CarContextType | undefined>(undefined);

export function CarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCarId, setSelectedCarIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCars = async () => {
    if (!user) {
      setCars([]);
      setSelectedCarIdState(null);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/cars');
      if (res.ok) {
        const data = await res.json();
        setCars(data);

        // Se houver carros cadastrados e nenhum selecionado, seleciona o primeiro
        if (data.length > 0) {
          const cached = localStorage.getItem('autocare_selected_car_id');
          const stillExists = cached && data.some((c: Car) => c.id === cached);
          
          if (stillExists) {
            setSelectedCarIdState(cached);
          } else {
            setSelectedCarIdState(data[0].id);
            localStorage.setItem('autocare_selected_car_id', data[0].id);
          }
        } else {
          setSelectedCarIdState(null);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar carros:', error);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedCarId = (id: string | null) => {
    setSelectedCarIdState(id);
    if (id) {
      localStorage.setItem('autocare_selected_car_id', id);
    } else {
      localStorage.removeItem('autocare_selected_car_id');
    }
  };

  // user.id, não o objeto: a identidade do objeto mudava a cada revalidação
  // e disparava um /api/cars extra por navegação.
  useEffect(() => {
    fetchCars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectedCar = cars.find(c => c.id === selectedCarId) || null;

  return (
    <CarContext.Provider
      value={{
        cars,
        selectedCar,
        selectedCarId,
        setSelectedCarId,
        loading: loading && cars.length === 0,
        refreshCars: fetchCars,
      }}
    >
      {children}
    </CarContext.Provider>
  );
}

export function useCar() {
  const context = useContext(CarContext);
  if (context === undefined) {
    throw new Error('useCar deve ser usado dentro de um CarProvider');
  }
  return context;
}
