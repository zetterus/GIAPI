namespace GIAPI.Models
{
    public class User
    {
        public int Id { get; set; }
        public required string Username { get; set; }
        public required string PasswordHash { get; set; }
        public Role Role { get; set; }
        public List<InventoryBag> InventoryBags { get; set; } = new(); // Список инвентарей пользователя
    }
}