namespace GIAPI.Models.ItemModel
{
    public class Item
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public ItemType Type { get; set; }
        public int Level { get; set; }
        public Rarity Rarity { get; set; }
        public int Attack { get; set; }
        public int Defense { get; set; }
        public int Health { get; set; }
        public List<ItemProperty> Properties { get; set; } = new();
    }
}