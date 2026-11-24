using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bunker.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEventFeedAndDiscussionTimer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTimerPaused",
                table: "Rooms",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PausedRemainingSeconds",
                table: "Rooms",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PhaseEndsAtUtc",
                table: "Rooms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PhaseStartedAtUtc",
                table: "Rooms",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GameEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RoomId = table.Column<Guid>(type: "uuid", nullable: false),
                    EventType = table.Column<int>(type: "integer", nullable: false),
                    Message = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Day = table.Column<int>(type: "integer", nullable: false),
                    Phase = table.Column<int>(type: "integer", nullable: false),
                    ActorPlayerId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorNickname = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameEvents_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameEvents_RoomId_CreatedAt",
                table: "GameEvents",
                columns: new[] { "RoomId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameEvents");

            migrationBuilder.DropColumn(
                name: "IsTimerPaused",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "PausedRemainingSeconds",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "PhaseEndsAtUtc",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "PhaseStartedAtUtc",
                table: "Rooms");
        }
    }
}
