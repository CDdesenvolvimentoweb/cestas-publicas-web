import React, { useState, useEffect } from 'react';
import { MapPin, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface RegionalCity {
  id: string;
  name: string;
  state_code: string;
  ibge_code: string;
  is_regional: boolean;
}

interface RegionalFilterProps {
  onFiltersChange: (filters: {
    selectedCities: string[];
    includeRegional: boolean;
    radiusKm: number;
  }) => void;
}

export const RegionalFilter: React.FC<RegionalFilterProps> = ({
  onFiltersChange
}) => {
  const [cities, setCities] = useState<RegionalCity[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [includeRegional, setIncludeRegional] = useState(true);
  const [radiusKm, setRadiusKm] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegionalCities();
  }, []);

  useEffect(() => {
    onFiltersChange({
      selectedCities,
      includeRegional,
      radiusKm
    });
  }, [selectedCities, includeRegional, radiusKm, onFiltersChange]);

  const loadRegionalCities = async () => {
    try {
      const { data, error } = await supabase
        .from('regional_cities')
        .select('*')
        .order('name');

      if (error) throw error;

      setCities(data || []);
      
      // Pré-selecionar cidades regionais
      const regionalCities = (data || [])
        .filter(city => city.is_regional)
        .map(city => city.id);
      setSelectedCities(regionalCities);
      
    } catch (error) {
      console.error('Erro ao carregar cidades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCityToggle = (cityId: string, checked: boolean) => {
    if (checked) {
      setSelectedCities([...selectedCities, cityId]);
    } else {
      setSelectedCities(selectedCities.filter(id => id !== cityId));
    }
  };

  const handleSelectAll = () => {
    setSelectedCities(cities.map(city => city.id));
  };

  const handleClearAll = () => {
    setSelectedCities([]);
  };

  const selectedCityNames = cities
    .filter(city => selectedCities.includes(city.id))
    .map(city => city.name);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Carregando filtros regionais...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Filtros Regionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Raio de busca */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Raio de busca (km)</label>
          <Select value={radiusKm.toString()} onValueChange={(value) => setRadiusKm(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 km</SelectItem>
              <SelectItem value="50">50 km</SelectItem>
              <SelectItem value="100">100 km</SelectItem>
              <SelectItem value="200">200 km</SelectItem>
              <SelectItem value="500">500 km (Todo o ES)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Opção incluir regional */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeRegional"
            checked={includeRegional}
            onCheckedChange={(checked) => setIncludeRegional(checked as boolean)}
          />
          <label htmlFor="includeRegional" className="text-sm font-medium">
            Priorizar municípios da região
          </label>
        </div>

        {/* Seleção de cidades */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Cidades específicas</label>
            <div className="flex gap-1">
              <button 
                onClick={handleSelectAll}
                className="text-xs text-primary hover:underline"
              >
                Todas
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button 
                onClick={handleClearAll}
                className="text-xs text-primary hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Cidades selecionadas */}
          {selectedCityNames.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {selectedCityNames.map((cityName) => (
                <Badge key={cityName} variant="secondary" className="text-xs">
                  {cityName}
                </Badge>
              ))}
            </div>
          )}

          {/* Lista de cidades */}
          <div className="max-h-40 overflow-y-auto space-y-1 border rounded p-2">
            {cities.map((city) => (
              <div key={city.id} className="flex items-center space-x-2">
                <Checkbox
                  id={city.id}
                  checked={selectedCities.includes(city.id)}
                  onCheckedChange={(checked) => handleCityToggle(city.id, checked as boolean)}
                />
                <label htmlFor={city.id} className="text-sm flex-1 cursor-pointer">
                  {city.name}
                  {city.is_regional && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Regional
                    </Badge>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo do filtro */}
        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>
              {selectedCities.length} cidade(s) selecionada(s) • 
              Raio: {radiusKm}km • 
              {includeRegional ? 'Priorizando região' : 'Sem prioridade regional'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};