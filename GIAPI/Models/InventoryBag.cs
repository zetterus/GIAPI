using GIAPI.Models.ItemModel;

namespace GIAPI.Models
{
    public class InventoryBag
    {
        public int Id { get; set; }
        public int OwnerId { get; set; }
        public User? Owner { get; set; }
        public required string Name { get; set; }
        public Rarity Rarity { get; set; } = Rarity.Common;
        public List<Inventory> Inventories { get; set; } = new();
        public List<InventoryBagAccess> Accesses { get; set; } = new();
        public int MaxItems => (int)Rarity * 10;
    }
}