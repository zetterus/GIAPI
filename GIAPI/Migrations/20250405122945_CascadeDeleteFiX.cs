using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIAPI.Migrations
{
    /// <inheritdoc />
    public partial class CascadeDeleteFiX : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Inventories_Items_ItemId",
                table: "Inventories");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryBags_Users_UserId",
                table: "InventoryBags");

            migrationBuilder.DropTable(
                name: "TransactionLogs");

            migrationBuilder.DropIndex(
                name: "IX_InventoryBags_UserId",
                table: "InventoryBags");

            migrationBuilder.DropColumn(
                name: "ItemsJson",
                table: "InventoryBags");

            migrationBuilder.RenameColumn(
                name: "UserId",
                table: "InventoryBags",
                newName: "Rarity");

            migrationBuilder.AddColumn<int>(
                name: "OwnerId",
                table: "InventoryBags",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "InventoryBagAccesses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InventoryBagId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    AccessLevel = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryBagAccesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryBagAccesses_InventoryBags_InventoryBagId",
                        column: x => x.InventoryBagId,
                        principalTable: "InventoryBags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InventoryBagAccesses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBags_OwnerId",
                table: "InventoryBags",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBagAccesses_InventoryBagId",
                table: "InventoryBagAccesses",
                column: "InventoryBagId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBagAccesses_UserId",
                table: "InventoryBagAccesses",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Inventories_Items_ItemId",
                table: "Inventories",
                column: "ItemId",
                principalTable: "Items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryBags_Users_OwnerId",
                table: "InventoryBags",
                column: "OwnerId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Inventories_Items_ItemId",
                table: "Inventories");

            migrationBuilder.DropForeignKey(
                name: "FK_InventoryBags_Users_OwnerId",
                table: "InventoryBags");

            migrationBuilder.DropTable(
                name: "InventoryBagAccesses");

            migrationBuilder.DropIndex(
                name: "IX_InventoryBags_OwnerId",
                table: "InventoryBags");

            migrationBuilder.DropColumn(
                name: "OwnerId",
                table: "InventoryBags");

            migrationBuilder.RenameColumn(
                name: "Rarity",
                table: "InventoryBags",
                newName: "UserId");

            migrationBuilder.AddColumn<string>(
                name: "ItemsJson",
                table: "InventoryBags",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "TransactionLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TransactionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TransactionLogs_Items_ItemId",
                        column: x => x.ItemId,
                        principalTable: "Items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TransactionLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryBags_UserId",
                table: "InventoryBags",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionLogs_ItemId",
                table: "TransactionLogs",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_TransactionLogs_UserId",
                table: "TransactionLogs",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Inventories_Items_ItemId",
                table: "Inventories",
                column: "ItemId",
                principalTable: "Items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryBags_Users_UserId",
                table: "InventoryBags",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
