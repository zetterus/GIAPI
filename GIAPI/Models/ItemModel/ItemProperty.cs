namespace GIAPI.Models.ItemModel
{
    public class ItemProperty
    {
        public int Id { get; set; }
        public int ItemId { get; set; }
        public required string Key { get; set; }
        public required string Value { get; set; }
        public Item Item { get; set; } = null!;
    }
}