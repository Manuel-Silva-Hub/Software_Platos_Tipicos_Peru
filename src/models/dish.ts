//Represents a dish in the application.
export interface Dish {
  id: number; //Unique plate identifier
  name: string; //Name of the dish
  description: string | null; //Description of the dish (can be null if it doesn't have one)
  photo_url: string | null; //Dish photo URL (can be null if there is no image)
  region_id: number; //Identifier of the region to which the dish belongs
  created_at: string; //Date the record was created
  
  //Information about the region associated with the dish
  region: {
    name: string; //Nombre de la región
  }[];
}
