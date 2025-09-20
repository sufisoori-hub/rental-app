import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, ScrollView, TouchableOpacity, Linking, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as Notifications from "expo-notifications";

export default function App() {
  const [carts, setCarts] = useState([]);
  const [form, setForm] = useState({
    cartId: "",
    renterName: "",
    mobileNo: "",
    address: "",
    idProof: "",
    addressProofFile: null,
    securityDeposit: "",
    monthlyRent: "",
    startDate: "",
    dueDate: "",
    rentStatus: "Pending",
    locationLink: "",
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortOption, setSortOption] = useState("");

  useEffect(() => {
    const loadCarts = async () => {
      const data = await AsyncStorage.getItem("carts");
      if (data) setCarts(JSON.parse(data));
    };
    loadCarts();
  }, []);

  const saveCarts = async (newCarts) => {
    setCarts(newCarts);
    await AsyncStorage.setItem("carts", JSON.stringify(newCarts));
  };

  const handleChange = (name, value) => setForm({ ...form, [name]: value });

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.type === "success") setForm({ ...form, addressProofFile: result });
  };

  const scheduleReminder = async (cart) => {
    if (!cart.dueDate) return;
    const dueDate = new Date(cart.dueDate);
    dueDate.setHours(9, 0, 0);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Rent Due: ${cart.cartId}`,
        body: `Renter: ${cart.renterName}, ₹${cart.monthlyRent}`,
      },
      trigger: dueDate,
    });
  };

  const addCart = async () => {
    if (!form.cartId || !form.renterName || !form.monthlyRent) return;
    const newCart = { ...form };
    const updatedCarts = [...carts, newCart];
    await saveCarts(updatedCarts);
    await scheduleReminder(newCart);
    setForm({
      cartId: "",
      renterName: "",
      mobileNo: "",
      address: "",
      idProof: "",
      addressProofFile: null,
      securityDeposit: "",
      monthlyRent: "",
      startDate: "",
      dueDate: "",
      rentStatus: "Pending",
      locationLink: "",
      notes: "",
    });
  };

  const deleteCart = async (cartId) => {
    const updatedCarts = carts.filter((c) => c.cartId !== cartId);
    await saveCarts(updatedCarts);
  };

  const markPaid = async (cartId) => {
    const updatedCarts = carts.map((c) =>
      c.cartId === cartId ? { ...c, rentStatus: "Paid" } : c
    );
    await saveCarts(updatedCarts);
  };

  const totalCollected = carts.filter((c) => c.rentStatus === "Paid").reduce((sum, c) => sum + parseFloat(c.monthlyRent || 0), 0);
  const totalPending = carts.filter((c) => c.rentStatus !== "Paid").reduce((sum, c) => sum + parseFloat(c.monthlyRent || 0), 0);

  let filteredCarts = carts.filter(
    (c) =>
      (c.cartId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.renterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.rentStatus.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus === "" || c.rentStatus === filterStatus)
  );

  if (sortOption === "dueDate") filteredCarts.sort((a,b)=>new Date(a.dueDate)-new Date(b.dueDate));
  if (sortOption === "rentAmount") filteredCarts.sort((a,b)=>parseFloat(a.monthlyRent)-parseFloat(b.monthlyRent));

  const handlePreviewFile = (file) => { if(file?.uri) Linking.openURL(file.uri); };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Thela Rental Management</Text>

      <TextInput style={styles.input} placeholder="Search Cart ID / Renter / Status" value={searchTerm} onChangeText={setSearchTerm} />

      <View style={styles.row}>
        <Button title="Sort by Due Date" onPress={()=>setSortOption("dueDate")} />
        <Button title="Sort by Rent" onPress={()=>setSortOption("rentAmount")} />
        <Button title="Clear Sort" onPress={()=>setSortOption("")} />
      </View>

      <View style={styles.row}>
        <Button title="Show Pending" onPress={()=>setFilterStatus("Pending")} />
        <Button title="Show Paid" onPress={()=>setFilterStatus("Paid")} />
        <Button title="Clear Filter" onPress={()=>setFilterStatus("")} />
      </View>

      <Text style={styles.subtitle}>Add / Manage Thelas</Text>
      {["cartId","renterName","mobileNo","address","idProof","securityDeposit","monthlyRent","startDate","dueDate","rentStatus","locationLink","notes"].map(field=>(
        <TextInput key={field} style={styles.input} placeholder={field} value={form[field]} onChangeText={val=>handleChange(field,val)} />
      ))}
      <Button title="Pick Address Proof File" onPress={pickFile} />
      <Button title="Add / Save Cart" onPress={addCart} />

      <Text style={styles.subtitle}>Monthly Summary</Text>
      <Text>Total Collected: ₹{totalCollected}</Text>
      <Text>Total Pending: ₹{totalPending}</Text>

      {filteredCarts.map(cart=>(
        <View key={cart.cartId} style={styles.card}>
          <Text>Cart ID: {cart.cartId}</Text>
          <Text>Renter: {cart.renterName}</Text>
          <Text>Mobile: {cart.mobileNo}</Text>
          <Text>Rent: ₹{cart.monthlyRent}</Text>
          <Text>Status: {cart.rentStatus}</Text>
          {cart.addressProofFile && <Button title="Preview File" onPress={()=>handlePreviewFile(cart.addressProofFile)} />}
          {cart.locationLink && <TouchableOpacity onPress={()=>Linking.openURL(cart.locationLink)}><Text style={{color:'blue'}}>View Location</Text></TouchableOpacity>}
          {cart.rentStatus!=="Paid" && <Button title="Mark Paid" onPress={()=>markPaid(cart.cartId)} />}
          <Button title="Delete" onPress={()=>deleteCart(cart.cartId)} color="red" />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{padding:10,backgroundColor:'#f2f2f2'},
  title:{fontSize:24,fontWeight:'bold',marginBottom:10},
  subtitle:{fontSize:18,fontWeight:'bold',marginTop:15},
  input:{borderWidth:1,borderColor:'#ccc',padding:8,marginVertical:5,borderRadius:5,backgroundColor:'#fff'},
  row:{flexDirection:'row',justifyContent:'space-between',marginVertical:5},
  card:{backgroundColor:'#fff',padding:10,marginVertical:5,borderRadius:5},
});