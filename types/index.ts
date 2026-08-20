export interface Color {
  id: number;
  name: string;
  image_url?: string | null;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  commentary?: string;
  price: number;
  dimensions?: string;
  images: string[];
  is_available: boolean;
  layers?: number;
  mask_image_url?: string;
  customizable_image_index?: number;
  created_at?: string;
}