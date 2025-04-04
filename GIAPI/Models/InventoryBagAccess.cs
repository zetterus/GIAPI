namespace GIAPI.Models
{
    public class InventoryBagAccess
    {
        public int Id { get; set; }
        public int InventoryBagId { get; set; }
        public InventoryBag InventoryBag { get; set; } = null!;
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public AccessLevel AccessLevel { get; set; }
    }

    public enum AccessLevel
    {
        ViewOnly = 0,   // Только просмотр
        FullEdit = 1    // Полное редактирование
    }
}