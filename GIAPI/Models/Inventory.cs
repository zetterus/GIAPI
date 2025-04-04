using GIAPI.Models.ItemModel;

namespace GIAPI.Models
{
    public class Inventory
    {
        public int Id { get; set; }
        public int InventoryBagId { get; set; }
        public InventoryBag InventoryBag { get; set; } = null!;
        public int ItemId { get; set; }
        public Item Item { get; set; } = null!;
        public int Quantity { get; set; } = 1;
        public DateTime AddedDate { get; set; } = DateTime.Now;
    }
}