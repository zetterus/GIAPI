using GIAPI.Models;
using GIAPI.Models.ItemModel;

public class TransactionLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public required User User { get; set; }
    public int ItemId { get; set; }
    public required Item Item { get; set; }
    public required string Action { get; set; } // "Added", "Removed", "Transferred"
    public DateTime Timestamp { get; set; }
}