using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Bunker.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialDatabaseSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Rooms",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Code = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    CurrentPhase = table.Column<int>(type: "integer", nullable: false),
                    CurrentDay = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DayDurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    NightDurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    VotingDurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    MaxDays = table.Column<int>(type: "integer", nullable: false),
                    MaxPlayers = table.Column<int>(type: "integer", nullable: false),
                    BunkerCapacity = table.Column<int>(type: "integer", nullable: false),
                    IsRandomRevealOrder = table.Column<bool>(type: "boolean", nullable: false),
                    IsSoundEnabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rooms", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TraitCards",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    Value = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TraitCards", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nickname = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ConnectionId = table.Column<string>(type: "text", nullable: true),
                    IsHost = table.Column<bool>(type: "boolean", nullable: false),
                    IsReady = table.Column<bool>(type: "boolean", nullable: false),
                    IsOnline = table.Column<bool>(type: "boolean", nullable: false),
                    Role = table.Column<int>(type: "integer", nullable: false),
                    IsSilenced = table.Column<bool>(type: "boolean", nullable: false),
                    SurvivedInBunker = table.Column<bool>(type: "boolean", nullable: false),
                    RoomId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Players_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PlayerTraitCards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uuid", nullable: false),
                    TraitCardId = table.Column<int>(type: "integer", nullable: false),
                    IsRevealed = table.Column<bool>(type: "boolean", nullable: false),
                    RevealedOnDay = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerTraitCards", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlayerTraitCards_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlayerTraitCards_TraitCards_TraitCardId",
                        column: x => x.TraitCardId,
                        principalTable: "TraitCards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Players_RoomId",
                table: "Players",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerTraitCards_PlayerId_TraitCardId",
                table: "PlayerTraitCards",
                columns: new[] { "PlayerId", "TraitCardId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlayerTraitCards_TraitCardId",
                table: "PlayerTraitCards",
                column: "TraitCardId");

            migrationBuilder.CreateIndex(
                name: "IX_Rooms_Code",
                table: "Rooms",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerTraitCards");

            migrationBuilder.DropTable(
                name: "Players");

            migrationBuilder.DropTable(
                name: "TraitCards");

            migrationBuilder.DropTable(
                name: "Rooms");
        }
    }
}
