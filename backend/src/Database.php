<?php
declare(strict_types=1);

namespace IndraJatra;

use PDO;
use RuntimeException;

final class Database
{
    public static function connect(): PDO
    {
        $host = self::required('IJ26_DB_HOST');
        $name = self::required('IJ26_DB_NAME');
        $user = self::required('IJ26_DB_USER');
        $password = self::required('IJ26_DB_PASSWORD');
        $port = getenv('IJ26_DB_PORT') ?: '3306';

        return new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            $user,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }

    private static function required(string $name): string
    {
        $value = getenv($name);
        if ($value === false || trim($value) === '') {
            throw new RuntimeException("Missing required server configuration: {$name}");
        }
        return $value;
    }
}
