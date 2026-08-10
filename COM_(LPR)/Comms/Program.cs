using System;
using System.IO.Ports;

class Program
{
    static void Main()
    {
        SerialPort porta = new SerialPort();
        porta.PortName = "COM1"; //alterar dependendo da porta com do pc! a do 37 é essa
        porta.BaudRate = 115200;

        porta.Open();
    }
}